import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "登录 | ao",
};

export default async function LoginPage(props: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await props.searchParams;
  return <LoginForm nextPath={typeof next === "string" ? next : "/"} />;
}
