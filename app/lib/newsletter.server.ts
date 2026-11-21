import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';

/**
 * Storefront API mutation to create a customer record with email marketing consent.
 * Password is generated server-side — this flow is strictly for newsletter signup,
 * not account creation. Customer accounts / logins are handled in separate routes.
 */
const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      customerUserErrors {
        field
        message
        code
      }
    }
  }
` as const;

export type NewsletterResult =
  | {success: true; error?: never; status?: never}
  | {success?: never; error: string; status: number};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Signs an email up for marketing as a Shopify customer, so it shows up in
 * Shopify admin under Customers (subscribed to email marketing).
 */
export async function subscribeToNewsletter(
  storefront: HydrogenRouterContextProvider['storefront'],
  rawEmail: unknown,
): Promise<NewsletterResult> {
  const email = String(rawEmail || '').trim();

  if (!email || !EMAIL_PATTERN.test(email)) {
    return {error: 'Please enter a valid email address.', status: 400};
  }

  // Generate a random password since Storefront API requires one for customerCreate.
  // The user will never see or use this — newsletter signup is passwordless.
  const password = crypto.randomUUID();

  try {
    const {customerCreate} = await storefront.mutate(CUSTOMER_CREATE_MUTATION, {
      variables: {
        input: {
          email,
          password,
          acceptsMarketing: true,
        },
      },
    });

    const userErrors = customerCreate?.customerUserErrors ?? [];

    if (userErrors.length === 0) {
      return {success: true};
    }

    // If the email is already taken, treat it as a soft success.
    const isAlreadyTaken = userErrors.some(
      (e: {code?: string | null}) => e.code === 'TAKEN',
    );

    if (isAlreadyTaken) {
      return {success: true};
    }

    // Any other validation error — surface a friendly message.
    return {
      error:
        userErrors[0]?.message || 'Something went wrong. Please try again.',
      status: 400,
    };
  } catch {
    return {error: 'Something went wrong. Please try again.', status: 500};
  }
}
