"use client";
import { useEffect, useState, useMemo } from "react";
import QRCode from "react-qr-code";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "@/lib/supabase";
import { ConnectionDialog } from "@/components/ConnectionDialog";
import { toast } from "react-hot-toast";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  language: string;
}

export default function Home() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [connectionRequest, setConnectionRequest] = useState<{
    id: string;
    fromUserId: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, language")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUserProfile({
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            language: profile.language,
          });
        }
      }
    };

    fetchUserProfile();
  }, []);

  const qrCodeValue = useMemo(() => {
    if (!userProfile) return "";
    return JSON.stringify({
      id: userProfile.id,
      language: userProfile.language,
    });
  }, [userProfile]);

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
          filter: `to_user_id=eq.${userProfile?.id}`,
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
        from_user_id: userProfile?.id,
        to_user_id: scannedUserId,
      });

      if (error) throw error;
      alert("Connection request sent!");
    } catch (error) {
      console.error("Error sending connection request:", error);
      alert("Error sending connection request");
    }
  };

  const createConnectionLink = async () => {
    if (!userProfile) return;

    const copyToClipboard = async (text: string) => {
      try {
        // Try using the modern clipboard API first
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        try {
          // Fallback for Safari: Create a temporary textarea element
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          textArea.style.top = "-999999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          // Use the older execCommand API as fallback
          document.execCommand("copy");
          textArea.remove();
          return true;
        } catch (fallbackErr) {
          return false;
        }
      }
    };

    try {
      // Create a new connection token
      const { data: tokenData, error: tokenError } = await supabase
        .from("connection_tokens")
        .insert({
          user_id: userProfile.id,
        })
        .select("token")
        .single();

      if (tokenError) throw tokenError;

      // Create the message with the connection link
      const message = `${userProfile.first_name} ${userProfile.last_name} wants to connect with you on Polyglot Chat! Click the link below to connect:\n\n${window.location.origin}/connect/${tokenData.token}`;

      // Copy to clipboard
      const copied = await copyToClipboard(message);

      if (copied) {
        toast.success("Connection message copied to clipboard!");
      } else {
        // If both clipboard methods fail, show the message in a modal or alert
        toast.error(
          "Could not copy automatically. Please copy this message manually:"
        );
        alert(message);
      }
    } catch (error) {
      console.error("Error creating connection link:", error);
      toast.error("Failed to create connection link");
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
            {userProfile ? (
              <QRCode value={qrCodeValue} size={256} className="mx-auto" />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Loading...
              </div>
            )}
          </div>
        </div>

        <button
          onClick={createConnectionLink}
          className="w-full bg-green-600 text-white rounded-lg py-3 px-4 font-semibold hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Share Connection Link
        </button>

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
