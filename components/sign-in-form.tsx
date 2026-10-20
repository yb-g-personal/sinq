'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signIn, type SignInState } from '@/app/actions';

const initialState: SignInState = {};

export function SignInForm() {
  const [state, formAction] = useFormState(signIn, initialState);

  return <form action={formAction} className="mt-10 space-y-5">
    <label className="block text-sm">Email<input name="email" type="email" required className="mt-2 w-full border border-line bg-surface px-3 py-3 text-white outline-none focus:border-lavender" placeholder="you@example.com"/></label>
    <label className="block text-sm">Password<input name="password" type="password" required className="mt-2 w-full border border-line bg-surface px-3 py-3 text-white outline-none focus:border-lavender" placeholder="••••••••"/></label>
    {state.error && <p role="alert" className="border border-[#8f4d6a] bg-[#24101c] px-3 py-3 text-sm leading-relaxed text-[#f4b6cc]">{state.error}</p>}
    <SubmitButton />
  </form>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full bg-purple py-3 text-sm text-ink disabled:cursor-wait disabled:opacity-60">{pending ? 'Signing in...' : 'Sign in'}</button>;
}