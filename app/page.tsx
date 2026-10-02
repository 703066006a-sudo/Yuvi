import {requireChatGPTUser} from './chatgpt-auth';
import ReplayWorkspace from '@/components/replay-workspace';
export const dynamic='force-dynamic';
async function AuthenticatedWorkspace(){await requireChatGPTUser('/');return <ReplayWorkspace/>;}
export default function Page(){return <AuthenticatedWorkspace/>;}
