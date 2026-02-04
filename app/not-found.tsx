"use client";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">Page not found</p>
    </div>
  );
}
