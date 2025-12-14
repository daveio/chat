import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";
import { defineConfig, type PluginOption } from "vite";

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname;

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		// DO NOT REMOVE
		createIconImportProxy() as PluginOption,
		sparkPlugin({ port: 3000 }) as PluginOption,
	],
	server: {
		host: true,
	},
	resolve: {
		alias: {
			"@": resolve(projectRoot, "src"),
		},
	},
});
