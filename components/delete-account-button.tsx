"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/app/actions/auth";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export function DeleteAccountButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteAccount();

    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowConfirm(true)}
            className="w-full sm:w-auto"
          >
            Delete My Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Confirm Account Deletion
        </CardTitle>
        <CardDescription>
          This action cannot be undone. All your votes and profile data will be
          permanently deleted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <p className="font-medium mb-1">Warning:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your profile will be deleted</li>
            <li>All your votes will be removed</li>
            <li>This cannot be reversed</li>
          </ul>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type <span className="font-mono text-destructive">DELETE</span> to
            confirm:
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="font-mono"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirm(false);
              setConfirmText("");
              setError(null);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== "DELETE" || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Permanently Delete"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
