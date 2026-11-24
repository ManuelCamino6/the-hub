
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

export default function AuthErrorPage() {
    return (
        <main className="flex min-h-svh items-center justify-center p-6">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>Authentication failed</CardTitle>
                    <CardDescription>
                        We could not complete your authentication.
                        Please try again.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/login">Back to login</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
