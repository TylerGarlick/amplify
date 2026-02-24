// Type declarations for CSS/style imports used in Next.js
declare module "*.css" {
  const styles: { [className: string]: string };
  export default styles;
}
