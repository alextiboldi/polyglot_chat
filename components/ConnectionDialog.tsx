import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ConnectionDialogProps {
  requestId: string;
  fromUserId: string;
  onClose: () => void;
}

export function ConnectionDialog({
  requestId,
  fromUserId,
  onClose,
}: ConnectionDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleResponse = async (accept: boolean) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId);

      if (error) throw error;
      onClose();
    } catch (error) {
      console.error("Error updating connection request:", error);
      alert("Error updating connection request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">Connection Request</h2>
        <p className="text-gray-600 mb-6">
          User {fromUserId} wants to connect with you. Do you accept?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => handleResponse(false)}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={() => handleResponse(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
