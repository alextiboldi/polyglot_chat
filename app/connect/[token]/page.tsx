"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ConnectPageProps {
  params: {
    token: string;
  };
}

interface TokenUser {
  first_name: string;
  last_name: string;
}

export default function ConnectPage({ params }: ConnectPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenUser, setTokenUser] = useState<TokenUser | null>(null);

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Get the token user
        const { data: tokenData, error: tokenError } = await supabase
          .from("connection_tokens")
          .select(
            `
            id,
            user_id, 
            profiles (
              first_name,
              last_name
            )
          `
          )
          .eq("token", params.token)
          .single();

        if (tokenError || !tokenData) {
          throw new Error("Invalid or expired connection link");
        }

        setTokenUser({
          first_name: tokenData.profiles.first_name,
          last_name: tokenData.profiles.last_name,
        });

        // Create connection request
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push(
            "/auth/login?redirect=" +
              encodeURIComponent("/connect/" + params.token)
          );
          return;
        }

        // Create connection and get chat ID in one transaction
        const { data: connection, error: connectionError } = await supabase
          .rpc("create_connection_from_token", {
            p_from_user_id: user.id,
            p_to_user_id: tokenData.user_id,
          })
          .single();

        if (connectionError) {
          if (connectionError.code === "23505") {
            // Unique violation
            setError("Connection request already sent");
          } else {
            throw connectionError;
          }
        } else {
          // Get the chat ID for this connection
          const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("id")
            .eq("connection_id", connection.id)
            .single();

          if (chatError) throw chatError;

          // Redirect to the chat page
          router.push(`/main/chat/${chat.id}`);
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [params.token, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating connection link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connection Error
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Connecting with {tokenUser?.first_name} {tokenUser?.last_name}
        </h1>
        <p className="text-gray-600">
          Please wait while we establish the connection...
        </p>
      </div>
    </div>
  );
}
