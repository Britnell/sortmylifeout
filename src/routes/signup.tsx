import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signup')({
	component: SignupPage,
})

function SignupPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
			<div className="w-full max-w-md space-y-8">
				<div>
					<h2 className="text-center text-3xl font-extrabold text-gray-900">
						Create your account
					</h2>
				</div>
				<form className="mt-8 space-y-6" id="signupForm">
					<input type="hidden" name="remember" value="true" />
					<div className="-space-y-px rounded-md shadow-sm">
						<div>
							<label htmlFor="username" className="sr-only">
								Username
							</label>
							<input
								id="username"
								name="username"
								type="text"
								required
								className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
								placeholder="Username"
							/>
						</div>
						<div>
							<label htmlFor="email" className="sr-only">
								Email address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								className="relative block w-full appearance-none rounded-none border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
								placeholder="Email address"
							/>
						</div>
						<div>
							<label htmlFor="password" className="sr-only">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								required
								className="relative block w-full appearance-none rounded-none border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
								placeholder="Password"
							/>
						</div>
						<div>
							<label htmlFor="confirmPassword" className="sr-only">
								Confirm password
							</label>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								required
								className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
								placeholder="Confirm password"
							/>
						</div>
					</div>

					<div>
						<button
							type="submit"
							className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						>
							Sign up
						</button>
					</div>
				</form>
				<p className="text-center text-sm text-gray-600">
					Already have an account?{' '}
					<a
						href="/login"
						className="font-medium text-indigo-600 hover:text-indigo-500"
					>
						Sign in
					</a>
				</p>
			</div>
		</div>
	)
}
