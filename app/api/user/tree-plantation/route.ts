// Opt out of static generation - handler connects to MongoDB at request time.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// CO₂ absorbed per mature tree per year (~21 kg/year) used to estimate offset.
const KG_CO2_PER_TREE_PER_YEAR = 21;

// GET /api/user/tree-plantation - Return the user's tree plantation data.
export async function GET(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const plantations = (user.treePlantations || []).map(
      (entry: {
        date: Date;
        treesPlanted: number;
        location?: string;
        treeType?: string;
        notes?: string;
        carbonOffset: number;
      }) => ({
        date: entry.date,
        treesPlanted: entry.treesPlanted,
        location: entry.location || '',
        treeType: entry.treeType || '',
        notes: entry.notes || '',
        carbonOffset: entry.carbonOffset,
      })
    );

    const totalTrees = plantations.reduce(
      (sum: number, p: { treesPlanted: number }) => sum + p.treesPlanted,
      0
    );

    const totalCarbonOffset = plantations.reduce(
      (sum: number, p: { carbonOffset: number }) => sum + p.carbonOffset,
      0
    );

    // Group trees planted by month for progress charts.
    const monthlyMap = new Map<string, number>();
    for (const p of plantations) {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + p.treesPlanted);
    }

    const monthlyProgress = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, trees]) => ({ month, trees }));

    return NextResponse.json({
      totalTrees,
      totalCarbonOffset,
      plantations,
      monthlyProgress,
    });
  } catch (error) {
    console.error('Error fetching tree plantation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tree plantation data' },
      { status: 500 }
    );
  }
}

// POST /api/user/tree-plantation - Record a new tree plantation entry.
export async function POST(req: Request) {
  const email = req.headers.get('x-user-email');

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload: unknown = await req.json();

    if (typeof payload !== 'object' || payload === null) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const {
      treesPlanted,
      location,
      treeType,
      notes,
      date,
    } = payload as {
      treesPlanted?: unknown;
      location?: unknown;
      treeType?: unknown;
      notes?: unknown;
      date?: unknown;
    };

    const treesValue = Number(treesPlanted);

    if (
      treesPlanted === undefined ||
      treesPlanted === null ||
      !Number.isFinite(treesValue) ||
      treesValue <= 0
    ) {
      return NextResponse.json(
        { error: 'treesPlanted must be a positive number' },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const carbonOffset = Math.round(treesValue * KG_CO2_PER_TREE_PER_YEAR);
    const entryDate = date ? new Date(date) : new Date();

    if (Number.isNaN(entryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date provided' },
        { status: 400 }
      );
    }

    user.treePlantations.push({
      date: entryDate,
      treesPlanted: treesValue,
      location: typeof location === 'string' ? location : '',
      treeType: typeof treeType === 'string' ? treeType : '',
      notes: typeof notes === 'string' ? notes : '',
      carbonOffset,
    });

    await user.save();

    const totalTrees = (user.treePlantations || []).reduce(
      (sum: number, p: { treesPlanted: number }) => sum + p.treesPlanted,
      0
    );

    return NextResponse.json({
      success: true,
      treesPlanted: treesValue,
      carbonOffset,
      totalTrees,
    });
  } catch (error) {
    console.error('Error recording tree plantation entry:', error);
    return NextResponse.json(
      { error: 'Failed to record tree plantation entry' },
      { status: 500 }
    );
  }
}
