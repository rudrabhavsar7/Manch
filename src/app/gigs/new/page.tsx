import { createClient } from '@/lib/supabase/server';
import { CreateGigForm } from '@/components/gigs/create-gig-form';
import { redirect } from 'next/navigation';

export default async function NewGigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <CreateGigForm />
    </div>
  );
}
