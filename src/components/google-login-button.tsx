
import { loginWithGoogle } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function GoogleLoginButton() {
  return (
    <Button
      type="submit"
      variant="outline"
      formAction={loginWithGoogle}
      formNoValidate
      className="w-full"
    >
      Continue with Google
    </Button>
  );
}
