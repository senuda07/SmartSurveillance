import { useRef, useState, useEffect } from 'react';
import { Mic, Upload, AudioLines, RefreshCw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  }
});

function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOkbutton, setShowOkbutton] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunks.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        getLocation();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimer(0);

      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Microphone access is required to record audio.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const clearSelection = () => {
    setAudioURL(null);
    setAudioBlob(null);
  };

  const handleUpload = async () => {
    if (!audioBlob || latitude === null || longitude === null) {
      alert('Missing audio or location data');
      return;
    }
    setIsLoading(true);

    const location = { latitude, longitude };
    const uniqueAudioTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `audio_${uniqueAudioTimestamp}.webm`;
    const folderPrefix = 'audios';
    const audioKey = `${folderPrefix}/audios/${uniqueAudioTimestamp}_${fileName}`;
    const metadataKey = `${folderPrefix}/metadata/${uniqueAudioTimestamp}_${fileName}.json`;

    try {
      const audioUploadCommand = new PutObjectCommand({
        Bucket: 'licence-pro-s3',
        Key: audioKey,
        Body: await audioBlob.arrayBuffer(),
        ContentType: audioBlob.type,
      });
      await s3.send(audioUploadCommand);

      const metadata = JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        uploadedAt: new Date().toISOString(),
      });
      const metadataUploadCommand = new PutObjectCommand({
        Bucket: 'licence-pro-s3',
        Key: metadataKey,
        Body: metadata,
        ContentType: 'application/json',
      });
      await s3.send(metadataUploadCommand);

      clearSelection();
      setShowOkbutton(true);
    } catch (error: any) {
      console.error('S3 upload error:', error);
      const fullMessage = `${error.name || 'Error'}: ${error.message || 'Unknown error occurred'}`;
      alert(`❌ Upload failed:\n${fullMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsRecording(false);
    setAudioURL(null);
    setTimer(0);
    setLatitude(null);
    setLongitude(null);
    setAudioBlob(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to retrieve your location.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  // 🔑 Spacebar event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isRecording) {
        e.preventDefault();
        handleStartRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        handleStopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="text-center mt-6">
        <h2 className="text-3xl font-bold text-white">🎙️SmartShield Audio</h2>
        <p className="mt-2 text-zinc-400">Your Smart Security Assisstant</p>
      </div>

      <div className="max-w-md mx-auto mt-10">
        <motion.div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 relative">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRefresh}
            className="absolute top-4 right-4 bg-zinc-800 p-2 rounded-full hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={20} color="white" />
          </motion.button>

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block p-4 bg-zinc-800 rounded-2xl mb-4"
            >
              <AudioLines size={32} />
            </motion.div>
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2"
            >
              Push to Talk
            </motion.h1>
            <p className="text-zinc-400">Press & Hold the Button to Record</p>

          </div>

          {/* Push to Talk Button */}
          <div className="space-y-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
              className={`w-full flex items-center justify-center space-x-2 ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } transition-colors text-white font-medium py-4 rounded-2xl`}
            >
              <Mic size={20} />
              <span>{isRecording ? 'Recording... Release to Stop' : 'Hold to Talk'}</span>
            </motion.button>

            {isRecording && (
              <div className="text-center text-sm text-zinc-400">
                Recording Time: <span className="font-mono text-white">{formatTime(timer)}</span>
              </div>
            )}

            {audioURL && (
              <>
                <audio controls src={audioURL} className="w-full mt-4 rounded-lg" />
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
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span>Confirm Command</span>
                      </>
                    )}
                  </motion.button>
              </>
            )}
          </div>

          {latitude && longitude && (
          <div className="mt-6">
            <div className="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-sm text-center">
              <div className="flex flex-col items-center justify-center space-y-2 mb-2 text-zinc-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 3.636a8 8 0 0111.314 11.314l-5.657 5.657a1 1 0 01-1.414 0L5.05 14.95a8 8 0 010-11.314zM10 11a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Location Detected</span>
              </div>
              <div className="text-sm text-zinc-200 font-mono">
                <p>Latitude: {latitude.toFixed(4)}</p>
                <p>Longitude: {longitude.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}


        </motion.div>

        <AnimatePresence>
          {showOkbutton && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="p-6 rounded-lg shadow-lg w-[90%] max-w-sm mx-4 bg-black text-white"
              >
                <h2 className="text-lg font-semibold mb-4">Successful</h2>
                <p className="mb-6">Command Sent Successfully</p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowOkbutton(false)}
                    className="px-4 py-2 rounded-lg transition-colors bg-green-500 hover:bg-green-500/80"
                  >
                    Okay
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default AudioRecorder;
