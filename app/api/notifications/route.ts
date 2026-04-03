import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Get user from auth cookie
async function getUser(_request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('sb-auth-token');
  
  if (!authCookie) {
    return null;
  }
  
  try {
    const token = JSON.parse(authCookie.value);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(token.access_token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get push subscriptions for this user
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, device_name, user_agent, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (subsError) {
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      preferences: preferences || null,
      subscriptions: subscriptions || [],
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const body = await request.json();
    const { preferences, subscription } = body;
    
    // Upsert notification preferences
    if (preferences) {
      const { error: prefError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (prefError) {
        return NextResponse.json({ error: prefError.message }, { status: 500 });
      }
    }
    
    // Save push subscription if provided
    if (subscription) {
      const { endpoint, p256dh, auth } = subscription;
      
      const { error: subError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint,
          p256dh_key: p256dh,
          auth_key: auth,
          user_agent: request.headers.get('user-agent') || null,
        }, { onConflict: 'endpoint' });
      
      if (subError) {
        return NextResponse.json({ error: subError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('id');
    
    if (subscriptionId) {
      // Delete specific subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', user.id);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Delete all subscriptions for this user
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}