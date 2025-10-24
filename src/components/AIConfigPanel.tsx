import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AIConfig, AIProvider } from '@/services/aiService';
import { Brain } from 'lucide-react';

interface AIConfigPanelProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

const AIConfigPanel = ({ config, onChange }: AIConfigPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          تنظیمات هوش مصنوعی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>ارائه‌دهنده هوش مصنوعی</Label>
          <Select
            value={config.provider}
            onValueChange={(value: AIProvider) => onChange({ ...config, provider: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
              <SelectItem value="ollama">Ollama (محلی)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.provider !== 'ollama' && (
          <div className="space-y-2">
            <Label>کلید API</Label>
            <Input
              type="password"
              placeholder="کلید API خود را وارد کنید"
              value={config.apiKey || ''}
              onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>مدل</Label>
          <Input
            placeholder={
              config.provider === 'openai' ? 'gpt-3.5-turbo' :
              config.provider === 'openrouter' ? 'openai/gpt-3.5-turbo' :
              'llama2'
            }
            value={config.model || ''}
            onChange={(e) => onChange({ ...config, model: e.target.value })}
          />
        </div>

        {config.provider === 'ollama' && (
          <div className="space-y-2">
            <Label>آدرس پایه</Label>
            <Input
              placeholder="http://localhost:11434"
              value={config.baseURL || ''}
              onChange={(e) => onChange({ ...config, baseURL: e.target.value })}
            />
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-900 space-y-2">
          <p className="font-medium">راهنما:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>برای OpenAI: کلید API از platform.openai.com دریافت کنید</li>
            <li>برای OpenRouter: کلید API از openrouter.ai دریافت کنید</li>
            <li>برای Ollama: ابتدا Ollama را روی سیستم خود نصب کنید</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIConfigPanel;