'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

type Props = {
  text: React.ReactNode;
  isUser?: boolean;
  analysisId?: string;
};

export default function ChatBubble({ text, isUser = false, analysisId }: Props) {
  const router = useRouter();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`p-3 rounded-lg max-w-lg ${
          isUser ? 'bg-blue-500 text-white' : 'bg-white text-black border'
        }`}
      >
        <div>{text}</div>

        {!isUser && analysisId && (
          <Button
            className="mt-2"
            onClick={() => router.push(`/analysis/${analysisId}`)}
          >
            عرض التفاصيل
          </Button>
        )}
      </div>
    </div>
  );
}
