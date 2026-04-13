import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { addBoundary, getBoundaries, MAX_BOUNDARIES } from '@/lib/boundaries';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const boundaries = await getBoundaries(user.id);
    return NextResponse.json({ boundaries });
  } catch (error) {
    console.error('Boundaries GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, description } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Boundary text is required' }, { status: 400 });
    }

    // Check max boundaries
    const existing = await getBoundaries(user.id);
    if (existing.length >= MAX_BOUNDARIES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BOUNDARIES} boundaries allowed` },
        { status: 400 }
      );
    }

    const result = await addBoundary(user.id, text.trim(), existing.length, description);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ boundaries: result.data });
  } catch (error) {
    console.error('Boundaries POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
    }

    // Update order for each boundary
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase
        .from('boundaries')
        .update({ boundary_order: i })
        .eq('id', orderedIds[i])
        .eq('user_id', user.id);
    }

    const boundaries = await getBoundaries(user.id);
    return NextResponse.json({ boundaries });
  } catch (error) {
    console.error('Boundaries PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}