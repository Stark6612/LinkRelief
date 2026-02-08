const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Attempting to create storage bucket via Prisma...');

    try {
        // 1. Create Bucket
        await prisma.$executeRawUnsafe(`
      insert into storage.buckets (id, name, public)
      values ('verification-docs', 'verification-docs', false)
      on conflict (id) do nothing;
    `);
        console.log('✅ Bucket "verification-docs" created (or already exists).');

        // 2. Enable RLS
        await prisma.$executeRawUnsafe(`
      alter table storage.objects enable row level security;
    `);
        console.log('✅ RLS enabled on storage.objects.');

        // 3. Drop existing policies to be safe
        await prisma.$executeRawUnsafe(`
      drop policy if exists "Users can upload their own verification docs" on storage.objects;
    `);
        await prisma.$executeRawUnsafe(`
      drop policy if exists "Users can view their own verification docs" on storage.objects;
    `);
        await prisma.$executeRawUnsafe(`
      drop policy if exists "Select All for Authenticated" on storage.objects; 
    `);

        // 4. Create Policies
        // Upload: Any authenticated user can upload to their own folder
        await prisma.$executeRawUnsafe(`
      create policy "Users can upload their own verification docs"
      on storage.objects for insert
      to authenticated
      with check ( bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text );
    `);

        // Select: Authenticated users (Admins) can view anything in this bucket
        // For now, we allow ALL authenticated users to view because defining "admin" in SQL is hard without custom claims setup
        await prisma.$executeRawUnsafe(`
      create policy "Select All for Authenticated"
      on storage.objects for select
      to authenticated
      using ( bucket_id = 'verification-docs' );
    `);
        console.log('✅ Policies created successfully.');

    } catch (error) {
        console.error('❌ Error executing SQL:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
