'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  TreePine,
  TrendingUp,
  Leaf,
  Award,
  Calendar,
  Plus,
  Share2,
  Sprout,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  Line,
  LineChart,
  ResponsiveContainer,
} from 'recharts';
import { toast } from '@/components/ui/use-toast';

interface PlantationEntry {
  date: string;
  treesPlanted: number;
  location: string;
  treeType: string;
  notes: string;
  carbonOffset: number;
}

interface TreePlantationData {
  totalTrees: number;
  totalCarbonOffset: number;
  plantations: PlantationEntry[];
  monthlyProgress: { month: string; trees: number }[];
}

// Badge thresholds based on cumulative trees planted.
const BADGES = [
  { id: 'seedling', name: 'Seedling', icon: '🌱', threshold: 1 },
  { id: 'sapling', name: 'Sapling', icon: '🌿', threshold: 10 },
  { id: 'gardener', name: 'Gardener', icon: '🌳', threshold: 50 },
  { id: 'forester', name: 'Forester', icon: '🪓', threshold: 100 },
  { id: 'conservationist', name: 'Conservationist', icon: '🌲', threshold: 500 },
  { id: 'planet-hero', name: 'Planet Hero', icon: '🌍', threshold: 1000 },
];

const MONTHLY_GOAL = 25;

function monthLabel(monthKey: string): string {
  const [year, m] = monthKey.split('-');
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function TreePlantationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TreePlantationData | null>(null);
  const [loading, setLoading] = useState(true);

  const [treesInput, setTreesInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [treeTypeInput, setTreeTypeInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
    } else {
      fetchData();
    }
  }, [user, router]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/user/tree-plantation', {
        headers: { 'x-user-email': user?.email ?? '' },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch tree plantation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const value = Number(treesInput);

    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a whole number of trees greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/tree-plantation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email ?? '',
        },
        body: JSON.stringify({
          treesPlanted: value,
          location: locationInput,
          treeType: treeTypeInput,
        }),
      });

      if (res.ok) {
        setTreesInput('');
        setLocationInput('');
        setTreeTypeInput('');
        await fetchData();
        toast({
          title: 'Trees recorded! 🌳',
          description: `${value} tree${value > 1 ? 's' : ''} added to your tracker.`,
        });
      } else {
        const result = await res.json().catch(() => ({}));
        toast({
          title: 'Could not save',
          description: result.error || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to add trees:', error);
      toast({
        title: 'Could not save',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!data) return;
    const text = `🌳 I've planted ${data.totalTrees} trees with EcoVerse and offset an estimated ${data.totalCarbonOffset} kg of CO₂! Join me in going green. #EcoVerse #Afforestation`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'My EcoVerse Tree Progress', text });
        return;
      }
    } catch {
      // User cancelled share — fall through to clipboard.
    }

    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        description: 'Share your progress with your friends!',
      });
    } catch {
      toast({
        title: 'Share',
        description: text,
      });
    }
  };

  const earnedBadges = useMemo(() => {
    if (!data) return [];
    return BADGES.filter((b) => data.totalTrees >= b.threshold);
  }, [data]);

  const currentMonthTrees = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const entry = data.monthlyProgress.find((m) => m.month === key);
    return entry?.trees || 0;
  }, [data]);

  const monthlyProgressPercentage = useMemo(() => {
    return Math.min((currentMonthTrees / MONTHLY_GOAL) * 100, 100);
  }, [currentMonthTrees]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.monthlyProgress.map((m) => ({
      month: monthLabel(m.month),
      trees: m.trees,
    }));
  }, [data]);

  const recentEntries = useMemo(() => {
    if (!data) return [];
    return [...data.plantations]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [data]);

  if (!user || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-green-900">Loading tree tracker...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-green-900 flex items-center gap-2">
              <TreePine className="h-8 w-8 text-green-700" />
              Tree Plantation Tracker
            </h1>
            <p className="text-gray-600 mt-2">
              Track your afforestation contributions and watch your impact grow.
            </p>
          </div>
          <Button
            onClick={handleShare}
            className="bg-green-600 hover:bg-green-700"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share progress
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-green-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Total Trees
              </CardTitle>
              <TreePine className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {data?.totalTrees || 0}
              </div>
              <p className="text-xs text-gray-600">trees planted</p>
            </CardContent>
          </Card>

          <Card className="bg-green-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                CO₂ Offset
              </CardTitle>
              <Leaf className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {data?.totalCarbonOffset || 0}
              </div>
              <p className="text-xs text-gray-600">kg CO₂ / year</p>
            </CardContent>
          </Card>

          <Card className="bg-green-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                This Month
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {currentMonthTrees}
              </div>
              <p className="text-xs text-gray-600">trees this month</p>
            </CardContent>
          </Card>

          <Card className="bg-green-100 border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Badges
              </CardTitle>
              <Award className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {earnedBadges.length}
              </div>
              <p className="text-xs text-gray-600">
                of {BADGES.length} unlocked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add trees */}
        <Card className="bg-emerald-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-emerald-900 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Log New Plantation
            </CardTitle>
            <CardDescription className="text-gray-600">
              Record trees you&apos;ve planted to update your progress.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <Label htmlFor="trees">Trees planted</Label>
                <Input
                  id="trees"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 5"
                  value={treesInput}
                  onChange={(e) => setTreesInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="treeType">Tree type</Label>
                <Input
                  id="treeType"
                  type="text"
                  placeholder="e.g. Neem"
                  value={treeTypeInput}
                  onChange={(e) => setTreeTypeInput(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g. City Park"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Saving...' : 'Add Trees'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Monthly progress + Achievement badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-teal-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Goal Progress
              </CardTitle>
              <CardDescription className="text-gray-600">
                {currentMonthTrees} / {MONTHLY_GOAL} trees this month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={monthlyProgressPercentage} className="h-3" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>{MONTHLY_GOAL}</span>
              </div>
              {monthlyProgressPercentage >= 100 ? (
                <Badge className="bg-green-600/50 text-green-600 border-green-700">
                  🎯 Monthly goal achieved!
                </Badge>
              ) : (
                <Badge className="bg-yellow-600/50 text-yellow-700 border-yellow-700">
                  Keep going — {MONTHLY_GOAL - currentMonthTrees} more to go
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-teal-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-teal-900 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievement Badges
              </CardTitle>
              <CardDescription className="text-gray-600">
                Unlock badges as you plant more trees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {BADGES.map((badge) => {
                  const earned = data
                    ? data.totalTrees >= badge.threshold
                    : false;
                  return (
                    <div
                      key={badge.id}
                      title={`${badge.name} — ${badge.threshold} trees`}
                      className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border ${
                        earned
                          ? 'border-green-600 bg-green-400/40'
                          : 'border-gray-400 bg-gray-400/20 opacity-60'
                      }`}
                    >
                      <span className="text-2xl grayscale-0">{badge.icon}</span>
                      <span className="text-xs font-medium mt-1 text-center">
                        {badge.name}
                      </span>
                      <span className="text-[10px] text-gray-600">
                        {badge.threshold}+
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-lime-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lime-900">
                Monthly Trees Planted
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your planting activity over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer
                  config={{ trees: { label: 'Trees' } }}
                  className="h-[250px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="trees" fill="#16a34a" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <p className="text-gray-600 text-center py-12">
                  No data yet. Start logging trees to see your progress chart!
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-lime-100 border-none shadow-md">
            <CardHeader>
              <CardTitle className="text-lime-900">Cumulative Growth</CardTitle>
              <CardDescription className="text-gray-600">
                Running total of trees planted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer
                  config={{ total: { label: 'Total Trees' } }}
                  className="h-[250px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData.reduce(
                        (acc: { month: string; total: number }[], point) => {
                          const prev = acc.length
                            ? acc[acc.length - 1].total
                            : 0;
                          acc.push({ month: point.month, total: prev + point.trees });
                          return acc;
                        },
                        []
                      )}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#15803d"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <p className="text-gray-600 text-center py-12">
                  No data yet. Your growth chart will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contribution history */}
        <Card className="bg-sky-100 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-sky-900 flex items-center gap-2">
              <Sprout className="h-5 w-5" />
              Contribution History
            </CardTitle>
            <CardDescription className="text-gray-600">
              Your recent tree planting entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEntries.length > 0 ? (
              <div className="space-y-3">
                {recentEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-sky-800/30 border border-sky-700"
                  >
                    <div>
                      <div className="font-medium text-sky-900">
                        {entry.treesPlanted} tree
                        {entry.treesPlanted > 1 ? 's' : ''}
                        {entry.treeType ? ` · ${entry.treeType}` : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        {entry.location
                          ? `${entry.location} · `
                          : ''}
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-sky-900">
                        {entry.carbonOffset} kg
                      </div>
                      <div className="text-xs text-gray-600">CO₂ offset</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">
                No contributions yet. Log your first tree plantation above!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
