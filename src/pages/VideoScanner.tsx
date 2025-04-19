import { useState } from 'react';
import { Upload } from 'lucide-react';
import { motion } from 'framer-motion';

function Scanner() {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUri(url);
      setResponseMessage(null); // Clear previous response
    }
  };

  const handleUpload = async () => {
    if (!videoUri) {
      alert('No video selected.');
      return;
    }
  
    setIsLoading(true);
    try {
      const response = await fetch(videoUri);
      const videoBlob = await response.blob();
  
      const formData = new FormData();
      formData.append('file', videoBlob, 'video.webm');
  
      const apiResponse = await fetch('http://54.255.100.1:8000/identify/', {
        method: 'POST',
        body: formData,
      });
  
      if (!apiResponse.ok) {
        throw new Error('Upload failed');
      }
  
      const result = await apiResponse.json();
      const matches = result.matches;
  
      // 👇 Conditional message
      if (matches.includes('Unknown')) {
        setResponseMessage('❌ No Regular Customer Detected');
      } else {
        setResponseMessage(`✅ Matches found: ${matches.join(', ')}`);
      }
    } catch (error: any) {
      console.error('Error during upload:', error);
      setResponseMessage(`❌ Upload failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="text-center mt-6">
        <h2 className="text-3xl font-bold text-white">🎥 SmartShield Scanner</h2>
        <p className="mt-2 text-zinc-400">Upload a video for face recognition</p>
      </div>

      <div className="max-w-md mx-auto mt-10">
        <motion.div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block p-4 bg-zinc-800 rounded-2xl mb-4"
            >
              <Upload size={32} />
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2"
            >
              Upload Video
            </motion.h1>
            <p className="text-zinc-400">Select a video file from your device</p>
          </div>

          <div className="space-y-4">
            <label
              htmlFor="video-upload"
              className="w-full py-4 px-6 text-white bg-zinc-600 rounded-2xl cursor-pointer hover:bg-zinc-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Upload size={20} />
              <span>Select Video</span>
            </label>
            <input
              type="file"
              accept="video/*"
              id="video-upload"
              onChange={handleFileChange}
              className="hidden"
            />

            {videoUri && (
              <>
                <video controls src={videoUri} className="w-full mt-4 rounded-lg" />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                  onClick={handleUpload}
                  className={`w-full flex items-center justify-center space-x-2 transition-colors text-white font-medium py-4 rounded-2xl ${
                    isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      <span>Send to API</span>
                    </>
                  )}
                </motion.button>
              </>
            )}

            {responseMessage && (
              <div className="mt-4 text-sm text-center text-white bg-zinc-800 rounded-lg p-4">
                {responseMessage}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Scanner;
