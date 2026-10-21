import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { User } from '../../auth/AuthContext';
import { primaryBtn, secondaryBtn } from '../../components/ui';

export function ClosingCta({ user }: { user: User | null }) {
  return (
    <section className="border-t border-line bg-sand/60">
      <div className="mx-auto grid max-w-page gap-8 px-5 py-16 md:px-8 md:py-20 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-7">
          <h2 className="font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-deep md:text-[36px]">
            {user ? `Welcome, ${user.name.split(' ')[0]}.` : 'Work with the platform'}
          </h2>
          <p className="mt-3 max-w-[520px] text-[16px] leading-[1.7] text-muted">
            {user
              ? 'Your account is active. Open a model to see its outputs and try it yourself.'
              : 'Create an account to access monitoring layers and research outputs, or sign in if you already have one.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
          {user ? (
            <a href="#models" className={`group ${primaryBtn} h-12`}>
              Open your models
              <ArrowRight className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" strokeWidth={1.75} />
            </a>
          ) : (
            <>
              <Link to="/register" className={`${primaryBtn} h-12`}>
                Register
              </Link>
              <Link to="/login" className={`${secondaryBtn} h-12`}>
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
