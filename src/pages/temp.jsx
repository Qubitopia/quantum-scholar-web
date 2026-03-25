import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowUpIcon } from "lucide-react"


export function Temp() {
    return (
        <div className="min-h-screen bg-white dark:text-slate-400">
            <div className="flex p-6">
                <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose text-slate-900 dark:text-slate-50">
                    <div>
                        <h1 className="font-medium">Project ready!</h1>
                        <p>You may now add components and start building.</p>
                        <p>We&apos;ve already added the button component for you.</p>
                        <Button className="mt-2" variant="outline">
                            Button
                        </Button>
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        (Press <kbd>d</kbd> to toggle dark mode)
                    </div>
                </div>
            </div>
            <div className="flex place-content-center px-4">
                <Card className="w-full max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-slate-50">Login to your account</CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">
                            Enter your email below to login to your account
                        </CardDescription>
                        <CardAction>
                            <Button variant="link" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50">Sign Up</Button>
                        </CardAction>
                    </CardHeader>
                    <CardContent>
                        <form>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-slate-900 dark:text-slate-50">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-200 dark:border-slate-700"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password" className="text-slate-900 dark:text-slate-50">Password</Label>
                                        <a
                                            href="#"
                                            className="ml-auto inline-block text-sm text-slate-600 dark:text-slate-400 underline-offset-4 hover:underline hover:text-slate-900 dark:hover:text-slate-50"
                                        >
                                            Forgot your password?
                                        </a>
                                    </div>
                                    <Input 
                                        id="password" 
                                        type="password" 
                                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-200 dark:border-slate-700"
                                        required 
                                    />
                                </div>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="flex-col gap-2 bg-transparent">
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                        <Button variant="outline" className="w-full dark:border-slate-700 dark:hover:bg-slate-800">
                            Login with Google
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="flex justify-center mt-6">
                <div className="flex flex-wrap items-center gap-2 md:flex-row">
                    <Button variant="outline" className="dark:border-slate-700 dark:hover:bg-slate-800">Button</Button>
                    <Button variant="outline" size="icon" aria-label="Submit" className="dark:border-slate-700 dark:hover:bg-slate-800">
                        <ArrowUpIcon />
                    </Button>
                </div>
            </div>
        </div>

    )
}

export default Temp
