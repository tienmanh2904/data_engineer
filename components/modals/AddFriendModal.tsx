"use client";

import React, { useState } from "react";
import axios from "axios";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import useModal from "@/hooks/useModal";
import { UserPlus } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
});

const AddFriendModal = () => {
  const { isOpen, onClose, type } = useModal();
  const isModalOpen = isOpen && type === "addFriend";
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setError("");
    setSuccess("");
    try {
      await axios.post("/api/friends/requests", {
        receiverUsername: values.username,
      });
      setSuccess(`Friend request sent to ${values.username}!`);
      form.reset();
      setTimeout(() => {
        router.refresh();
        onClose();
        setSuccess("");
      }, 1500);
    } catch (error: any) {
      const errorMessage = error.response?.data || error.message || "Failed to send friend request";
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    form.reset();
    setError("");
    setSuccess("");
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-[#1e1f22] text-black dark:text-white p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold flex items-center justify-center gap-2">
            <UserPlus className="h-6 w-6" />
            Add Friend
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Enter the username of the person you want to add as a friend.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-8 px-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs font-bold text-zinc-800 dark:text-zinc-400">
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={isLoading}
                        className="bg-zinc-300/50 dark:bg-zinc-900 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0"
                        placeholder="Enter username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400 rounded">
                  {success}
                </div>
              )}
            </div>
            <DialogFooter className="bg-gray-100 dark:bg-[#383338] px-6 py-4">
              <Button disabled={isLoading} variant="primary">
                Send Friend Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendModal;
