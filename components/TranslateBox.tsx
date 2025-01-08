'use client';
import { useState } from 'react';

interface TranslateBoxProps {
  placeholder: string;
  isSource: boolean;
}

export function TranslateBox({ placeholder, isSource }: TranslateBoxProps) {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('');

  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4">
        {isSource ? (
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 resize-none border-0 bg-transparent p-0 focus:ring-0 sm:text-sm"
              placeholder={placeholder}
            />
            <button
              onClick={startListening}
              className={`absolute bottom-2 right-2 p-2 rounded-full ${
                isListening ? 'text-red-500' : 'text-gray-500'
              } hover:bg-gray-100`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="w-full h-32 sm:text-sm">
            {text}
          </div>
        )}
      </div>
      <div className="border-t px-4 py-2 flex justify-end space-x-2">
        {isSource ? (
          <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Translate
          </button>
        ) : (
          <button className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            Copy
          </button>
        )}
      </div>
    </div>
  );
}