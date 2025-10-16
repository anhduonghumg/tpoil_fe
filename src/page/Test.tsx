import { useMe } from "../features/auth/hooks";
import { useAllDepts } from "../features/departments/hooks";

export const Test = () => {
  const me = useMe();
  console.log("Me in Test page", me);
  // const dept = useAllDepts();
  // console.log("Depts in Test page", dept.data);
  return <div>TestPage</div>;
};
