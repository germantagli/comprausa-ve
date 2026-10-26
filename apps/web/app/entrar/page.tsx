import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Entrar · CompraUSA VE",
  description: "Ingreso con un código de un solo uso.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <SignInForm />;
}
