"use client";

import { useState } from "react";
import * as Label from "@radix-ui/react-label";
import { LanguageSelect } from "@/components/LanguageSelect";
import { signUpSchema } from "@/lib/zod-schema";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmpassword: "",
    language: "en",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = signUpSchema.parse(formData);
      if (validatedData.password !== validatedData.confirmpassword) {
        setErrors({ confirmpassword: "Passwords do not match" });
        return;
      }

      setLoading(true);

      // Sign up with Supabase
      const { data, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: {
            email: validatedData.email, // This will be used by the trigger
          },
        },
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        throw authError;
      }

      if (data.user) {
        // Update the profile with additional information
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            first_name: validatedData.firstName,
            last_name: validatedData.lastName,
            language: validatedData.language,
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
          throw profileError;
        }

        // Redirect to main page after successful signup
        router.push("/main");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setErrors({ submit: error.message || "An error occurred during signup" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          <Link href="/" className="text-blue-600 hover:text-blue-500">
            Polyglot Chat
          </Link>
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label.Root
                className="block text-sm font-medium text-gray-700"
                htmlFor="email"
              >
                Email
              </Label.Root>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <Label.Root
                className="block text-sm font-medium text-gray-700"
                htmlFor="firstName"
              >
                First Name
              </Label.Root>
              <div className="mt-1">
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label.Root
                className="block text-sm font-medium text-gray-700"
                htmlFor="lastName"
              >
                Last Name
              </Label.Root>
              <div className="mt-1">
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <Label.Root
                className="block text-sm font-medium text-gray-700"
                htmlFor="password"
              >
                Password
              </Label.Root>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <Label.Root
                className="block text-sm font-medium text-gray-700"
                htmlFor="confirmpassword"
              >
                Confirm Password
              </Label.Root>
              <div className="mt-1">
                <input
                  id="confirmpassword"
                  name="confirmpassword"
                  type="password"
                  required
                  value={formData.confirmpassword}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.confirmpassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmpassword}
                  </p>
                )}
              </div>
            </div>

            <LanguageSelect defaultValue={formData.language} label="Language" />

            <div>
              <button
                disabled={loading}
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </div>

            {errors.submit && (
              <div className="mt-4 text-red-600 text-sm text-center">
                {errors.submit}
              </div>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
