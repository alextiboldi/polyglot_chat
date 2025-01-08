"use client";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/lib/supabase";
import { ConnectionDialog } from "@/components/ConnectionDialog";

const DUMMY_USER_ID = "12345"; // Replace with actual user ID from auth

export default function Home() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [connectionRequest, setConnectionRequest] = useState<{
    id: string;
    fromUserId: string;
  } | null>(null);

  const handleDecode = async (result: string) => {
    setResult(result);
    setScanning(false);
    await handleScan(result);
  };

  const handleError = (error: any) => {
    console.error(error);
    alert("Error accessing camera");
    setScanning(false);
  };

  useEffect(() => {
    // Subscribe to connection requests
    const channel = supabase
      .channel("connection_requests")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "connection_requests",
          filter: `to_user_id=eq.${DUMMY_USER_ID}`,
        },
        (payload: any) => {
          setConnectionRequest({
            id: payload.new.id,
            fromUserId: payload.new.from_user_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleScan = async (scannedUserId: string) => {
    try {
      const { error } = await supabase.from("connection_requests").insert({
        from_user_id: DUMMY_USER_ID,
        to_user_id: scannedUserId,
      });

      if (error) throw error;
      alert("Connection request sent!");
    } catch (error) {
      console.error("Error sending connection request:", error);
      alert("Error sending connection request");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <div className="max-w-sm w-full space-y-8">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          QR Code Scanner
        </h1>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="p-4 bg-white">
            <QRCode value={DUMMY_USER_ID} size={256} className="mx-auto" />
          </div>
        </div>

        {scanning ? (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <Scanner onScan={(result) => handleDecode} onError={handleError} />
          </div>
        ) : (
          <button
            onClick={() => setScanning(true)}
            className="w-full bg-blue-600 text-white rounded-lg py-3 px-4 font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Scan QR Code
          </button>
        )}

        {result && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="font-semibold mb-2">Scanned Result:</h2>
            <p className="text-gray-700 break-all">{result}</p>
          </div>
        )}
      </div>
      {connectionRequest && (
        <ConnectionDialog
          requestId={connectionRequest.id}
          fromUserId={connectionRequest.fromUserId}
          onClose={() => setConnectionRequest(null)}
        />
      )}
    </main>
  );
}
