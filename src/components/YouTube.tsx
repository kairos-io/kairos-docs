import React from 'react';

type YouTubeProps = {
  id: string;
  title?: string;
};

export default function YouTube({id, title = 'YouTube video'}: YouTubeProps): React.JSX.Element {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${id}`}
      title={title}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{width: '100%', aspectRatio: '16 / 9'}}
    />
  );
}
