/**
 * shared/ui — barrel re-exporting the shadcn primitives so consumers can
 * `import { Button } from "@/shared/ui";` instead of reaching into
 * `@/components/ui/button`. Files have not been physically moved yet.
 *
 * Add new primitives here as they're adopted across features.
 */
export { Button, buttonVariants } from "@/components/ui/button";
export { Input } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export { Textarea } from "@/components/ui/textarea";
export { Switch } from "@/components/ui/switch";
export { Checkbox } from "@/components/ui/checkbox";
export { Badge, badgeVariants } from "@/components/ui/badge";
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
export {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
export {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
export {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
export { Toaster } from "@/components/ui/sonner";
