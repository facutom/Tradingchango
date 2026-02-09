import React, { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  robots?: string;
}

const MetaTags: React.FC<MetaTagsProps> = ({ title, description, robots }) => {
  useEffect(() => {
    if (title) {
      document.title = title;
    }

    const setMeta = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.name = name;
        document.head.appendChild(element);
      }
      element.content = content;
    };

    if (description) {
      setMeta('description', description);
    }
    if (robots) {
      setMeta('robots', robots);
    }

  }, [title, description, robots]);

  return null;
};

export default MetaTags;