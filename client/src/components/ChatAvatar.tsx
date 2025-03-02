import { useUser } from "@/hooks/use-user";

interface AvatarProps {
  sender: 'user' | 'assistant';
}

export const ChatAvatar = ({ sender }: AvatarProps) => {
  const { user } = useUser();
  return (
    <div className={`w-8 ${sender === 'assistant' ? 'aspect-[9/16]' : 'h-8 rounded-full'} flex items-center justify-center overflow-hidden ${
      sender === 'assistant' ? '' : 'bg-[#294636]'
    }`}>
      {sender === 'assistant' ? (
        <img src="/images/nuri_chat.png" alt="Nuri" className="w-full h-full object-contain" />
      ) : (
        <span className="text-white text-sm">
          {user?.username[0].toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default ChatAvatar;
