// src/app/post/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/server";
import PostDetailView from "@/components/PostDetailView";
import Header from "@/components/ui/Header";

interface PostPageProps {
  params: { id: string };
}

async function getPost(id: string) {
  const supabase = createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !post) {
    return null;
  }

  return post;
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-16">
        <PostDetailView post={post} />
      </div>
    </>
  );
}

export async function generateMetadata({ params }: PostPageProps) {
  const post = await getPost(params.id);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: post.photos?.[0] ? [post.photos[0]] : [],
    },
  };
}
