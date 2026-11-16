import { HomeFlow } from "@/components/home-flow";
import { ScrollStory } from "@/components/scroll-story";
import "./home.css";

export default function HomePage() {
  return (
    <main>
      <ScrollStory />
      <HomeFlow />
    </main>
  );
}
