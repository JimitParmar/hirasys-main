import { PipelineBuilder } from "@/components/pipeline/PipelineBuilder";

export default function PipelinePage() {
  return (
    <div className="h-screen flex flex-col">
      {/* Simple header for now */}
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800">Hirasys</h1>
            <p className="text-xs text-slate-400 -mt-0.5">Pipeline Builder</p>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          Right-click on canvas to add nodes
        </div>
      </header>

      {/* Pipeline Builder */}
      <PipelineBuilder />
    </div>
  );
}