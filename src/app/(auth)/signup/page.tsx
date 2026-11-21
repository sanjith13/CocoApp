import { redirect } from 'next/navigation'

// Public sign-up is hidden for now: the owner adds users from /admin/users.
// The previous sign-up form is in git history (commit cfc65e0) if it is needed again.
export default function SignupPage() {
  redirect('/login')
}
