import { useQuery } from "@tanstack/react-query";
import { Contribution } from "../../components/SlidingScalePayment";
import { ContributionsKey, getItem } from "../asyncStorage";

export function useContributions() {
  const { data: contributions } = useQuery<Contribution[]>({
    queryKey: [ContributionsKey],
    queryFn: () => {
      return getItem<Contribution[]>(ContributionsKey) || [];
    },
  });
  return contributions;
}
