import {data, Form, useActionData, useNavigation} from 'react-router';
import type {Route} from './+types/newsletter.subscribe';
import {subscribeToNewsletter} from '~/lib/newsletter.server';

type ActionResponse =
  | {success: true; error?: never}
  | {success?: never; error: string};

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const result = await subscribeToNewsletter(
    context.storefront,
    formData.get('email'),
  );

  if (result.success) return data<ActionResponse>({success: true});
  return data<ActionResponse>({error: result.error}, {status: result.status});
}

export default function NewsletterSubscribePage() {
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="px-8 sm:px-12 lg:px-16 py-12 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Sign up for our newsletter</h1>
      <p className="text-sm text-gray-600 mb-8">
        Stay up to date with the latest drops, events, and stories from Ánimo
        Run Club.
      </p>

      {actionData?.success ? (
        <p className="text-sm font-medium">
          Thanks for subscribing! We&apos;ll be in touch.
        </p>
      ) : (
        <Form method="post">
          <div className="flex items-center border-b border-black pb-1">
            <input
              type="email"
              name="email"
              required
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              title="Please enter a valid email address"
              placeholder="Insert your e-mail address *"
              className="flex-1 bg-transparent text-sm outline-none focus:outline-none focus:ring-0 placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Subscribe"
              className="ml-2 disabled:opacity-50"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="text-black"
              >
                <path
                  d="M4 10h12M12 6l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>

          {actionData?.error && (
            <p className="text-sm text-red-600 mt-3">{actionData.error}</p>
          )}
        </Form>
      )}
    </div>
  );
}
