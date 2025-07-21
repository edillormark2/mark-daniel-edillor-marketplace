// src/app/post/[id]/loading.tsx
import Loading from "@/components/ui/Loading";
import Header from "@/components/ui/Header";

export default function PostLoading() {
  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center pt-16 bg-gray-50">
        <Loading text="Loading post details..." />
      </div>
    </>
  );
}
