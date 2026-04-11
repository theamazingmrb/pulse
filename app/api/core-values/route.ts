import { NextRequest, NextResponse } from 'next/server';
import { 
  getCoreValues, 
  addCoreValue, 
  updateCoreValue, 
  deleteCoreValue,
  reorderCoreValues 
} from '@/lib/core-values';
import { supabase } from '@/lib/supabase';

// GET /api/core-values - Get user's core values
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const values = await getCoreValues(user.id);
    return NextResponse.json({ values });
  } catch (error) {
    console.error('GET /api/core-values error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/core-values - Add a new core value
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { valueText, existingCount } = body;

    if (!valueText || typeof valueText !== 'string') {
      return NextResponse.json({ error: 'Value text is required' }, { status: 400 });
    }

    const existing = await getCoreValues(user.id);
    const result = await addCoreValue(user.id, valueText, existingCount ?? existing.length);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ values: result.data });
  } catch (error) {
    console.error('POST /api/core-values error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/core-values - Update or reorder core values
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Handle reorder
    if (body.orderedIds && Array.isArray(body.orderedIds)) {
      const result = await reorderCoreValues(user.id, body.orderedIds);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ values: result.data });
    }
    
    // Handle update
    if (body.valueId && body.valueText) {
      const result = await updateCoreValue(user.id, body.valueId, body.valueText);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ values: result.data });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/core-values error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/core-values - Delete a core value
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const valueId = searchParams.get('id');

    if (!valueId) {
      return NextResponse.json({ error: 'Value ID is required' }, { status: 400 });
    }

    const result = await deleteCoreValue(user.id, valueId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/core-values error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}