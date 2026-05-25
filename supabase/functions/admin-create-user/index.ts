import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  fullName?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'judge';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'غير مصرح' }, 401);
    }

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !callerProfile || callerProfile.role !== 'admin' || callerProfile.status !== 'approved') {
      return jsonResponse({ error: 'هذه العملية متاحة للأدمن فقط' }, 403);
    }

    const payload = (await request.json()) as CreateUserPayload;
    const fullName = payload.fullName?.trim() ?? '';
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password?.trim() ?? '';
    const role = payload.role === 'admin' ? 'admin' : 'judge';

    if (!fullName || !email || !password) {
      return jsonResponse({ error: 'الاسم والبريد وكلمة المرور مطلوبة' }, 400);
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, 400);
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, created_by_admin: 'true' },
    });

    if (createError || !createdUser.user) {
      return jsonResponse({ error: createError?.message ?? 'فشل إنشاء المستخدم' }, 400);
    }

    const { error: upsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: createdUser.user.id,
        full_name: fullName,
        role,
        status: 'approved',
      });

    if (upsertError) {
      await adminClient.auth.admin.deleteUser(createdUser.user.id);
      return jsonResponse({ error: upsertError.message }, 400);
    }

    return jsonResponse({
      id: createdUser.user.id,
      email,
      role,
      fullName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
