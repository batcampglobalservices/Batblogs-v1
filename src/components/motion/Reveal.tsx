import { PropsWithChildren } from 'react';
import { motion } from 'framer-motion';

type RevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  distance?: number;
}>;

const transition = {
  duration: 0.65,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const Reveal = ({
  children,
  className,
  delay = 0,
  distance = 24,
}: RevealProps) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: distance }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.18 }}
    transition={{ ...transition, delay }}
  >
    {children}
  </motion.div>
);

type PageRevealProps = PropsWithChildren<{
  className?: string;
}>;

export const PageReveal = ({ children, className }: PageRevealProps) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={transition}
  >
    {children}
  </motion.div>
);

export default Reveal;