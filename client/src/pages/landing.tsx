import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { SiFacebook, SiGoogle } from "react-icons/si";

export default function Landing() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleEmailBlur = () => {
    if (formData.email && !validateEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
    }
  };

  const handlePasswordBlur = () => {
    if (formData.password && formData.password.length < 8) {
      setErrors(prev => ({ ...prev, password: "Password must be at least 8 characters long" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    // Validate form
    let isValid = true;
    const newErrors: { [key: string]: string } = {};

    if (!formData.email || !validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/test-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthSuccess("Successfully signed in! Redirecting...");
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        setAuthError(data.message || "Invalid email or password. Please try again.");
      }
    } catch (error) {
      setAuthError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16 bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <div className="max-w-md w-full space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-meta-blue rounded-xl flex items-center justify-center shadow-md">
              <SiFacebook className="text-white text-xl" />
            </div>
            <h1 className="ml-3 text-2xl font-semibold text-neutral-800">Meta Ads Auditor</h1>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="bg-white rounded-2xl shadow-auth hover:shadow-auth-hover transition-shadow duration-300">
          <CardContent className="p-8">
            {/* Social Login Section */}
            <div className="space-y-4 mb-6">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center px-4 py-3 border border-neutral-200 rounded-lg shadow-sm bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200"
                onClick={handleGoogleLogin}
              >
                <SiGoogle className="w-5 h-5 mr-3" />
                <span className="text-sm font-medium">Continue with Google</span>
              </Button>


            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-neutral-500">Or continue with email</span>
              </div>
            </div>

            {/* Test Credentials Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Test Login Credentials</h4>
              <div className="text-sm text-blue-700">
                <p><strong>Email:</strong> test@metaaudit.com</p>
                <p><strong>Password:</strong> testpass123</p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm font-medium text-neutral-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={handleEmailBlur}
                  className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-200 ${
                    errors.email
                      ? "border-error focus:ring-error text-error"
                      : "border-neutral-200 focus:ring-meta-blue text-neutral-900"
                  }`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <div className="text-sm text-error mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm font-medium text-neutral-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    onBlur={handlePasswordBlur}
                    className={`w-full px-3 py-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors duration-200 ${
                      errors.password
                        ? "border-error focus:ring-error text-error"
                        : "border-neutral-200 focus:ring-meta-blue text-neutral-900"
                    }`}
                    placeholder="Enter your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <div className="text-sm text-error mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => handleInputChange("rememberMe", checked as boolean)}
                  />
                  <Label htmlFor="remember-me" className="text-sm text-neutral-700">
                    Remember me
                  </Label>
                </div>
                <Button
                  variant="link"
                  className="text-sm text-meta-blue hover:text-meta-blue-dark transition-colors duration-200 p-0"
                >
                  Forgot password?
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 text-sm font-medium rounded-lg text-white bg-meta-blue hover:bg-meta-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-meta-blue transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner className="mr-2" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in to your account"
                )}
              </Button>

              {/* Success/Error Messages */}
              {authError && (
                <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {authSuccess}
                </div>
              )}
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="font-medium text-meta-blue hover:text-meta-blue-dark transition-colors duration-200 p-0"
                >
                  Sign up for free
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
