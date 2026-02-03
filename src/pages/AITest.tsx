import { AIChatTest } from '@/components/dev/AIChatTest';

export default function AITest() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Lovable AI Integration Test</h1>
          <p className="text-muted-foreground">
            Testing streaming chat with google/gemini-3-flash-preview
          </p>
        </div>
        <AIChatTest />
      </div>
    </div>
  );
}
