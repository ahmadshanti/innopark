import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  judgeId: string;
  judgeName: string;
  projectName: string;
  projectNumber: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { judgeId, judgeName, projectName, projectNumber }: Payload = await req.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(judgeId);
    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ error: 'judge not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://innopark.najah.edu';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'INNOPARK <onboarding@resend.dev>',
        to: user.email,
        subject: `تم تعيينك لتقييم مشروع #${projectNumber} - INNOPARK`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1B3A7A">
            <h2 style="margin-bottom:8px">مرحباً ${judgeName}،</h2>
            <p>تم تعيينك لتقييم المشروع التالي على منصة <strong>INNOPARK</strong>:</p>
            <div style="background:#f5f7ff;border:1px solid #dce3f5;border-radius:10px;padding:16px;margin:20px 0">
              <div><strong>رقم المشروع:</strong> #${projectNumber}</div>
              <div style="margin-top:8px"><strong>اسم المشروع:</strong> ${projectName}</div>
            </div>
            <p>سجّل دخولك لمراجعة المشروع وبدء عملية التقييم:</p>
            <a href="${siteUrl}/login"
              style="display:inline-block;background:#1B3A7A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;margin-top:8px">
              الدخول إلى INNOPARK ←
            </a>
            <p style="margin-top:32px;color:#666;font-size:13px">مع التحية،<br/>فريق INNOPARK — جامعة النجاح الوطنية</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const body = await emailRes.text();
      return new Response(JSON.stringify({ error: body }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
