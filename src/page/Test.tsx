import { useMe } from "../features/auth/hooks";

export const Test = () => {
  const me = useMe();
  console.log("Me in Test page", me);
  return <div>TestPage</div>;
};
