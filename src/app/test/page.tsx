import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Tailwind Test Page</h1>
        <p className="text-slate-500">If you can see styled components below, Tailwind is working.</p>

        <div className="flex gap-3">
          <Button>Primary Button</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
        </div>

        <div className="flex gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge className="bg-emerald-100 text-emerald-700">Custom</Badge>
        </div>

        <Input placeholder="Type something..." className="max-w-md" />

        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">This is a card with proper styling, shadows, and rounded corners.</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-[#D1DEFF] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#0245EF]">42</p>
                <p className="text-xs text-[#0245EF]">Metric</p>
              </div>
              <div className="bg-emerald-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">89%</p>
                <p className="text-xs text-emerald-500">Score</p>
              </div>
              <div className="bg-purple-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">7</p>
                <p className="text-xs text-purple-500">Count</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-gradient-to-r from-[#0245EF] to-[#5B3FE6] rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold">Gradient Box</h2>
          <p className="text-[#D1DEFF] mt-2">If this has a purple gradient, CSS is working perfectly.</p>
        </div>
      </div>
    </div>
  );
}