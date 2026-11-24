
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const benefits = [
  {
    title: "Un modelo de datos común",
    description:
      "Conectá diferentes sistemas mediante un protocolo compartido.",
  },
  {
    title: "Permisos bajo tu control",
    description:
      "Definí qué información puede consultar y modificar cada integración.",
  },
  {
    title: "Visibilidad de la sincronización",
    description:
      "Consultá el estado y la actividad de tus integraciones.",
  },
];

const questions = [
  {
    question: "¿Qué es The Hub?",
    answer:
      "Una plataforma de sincronización de datos entre sistemas mediante conectores.",
  },
  {
    question: "¿Qué es un proyecto Business?",
    answer:
      "Es el espacio donde una organización instala conectores, configura integraciones y administra sus permisos.",
  },
  {
    question: "¿Qué es un proyecto Development?",
    answer:
      "Es el espacio donde los desarrolladores crean, configuran y distribuyen conectores.",
  },
  {
    question: "¿Necesito conocimientos técnicos?",
    answer:
      "Instalar y configurar un conector existente no requiere desarrollar una integración desde cero. Crear nuevos conectores requiere conocimientos de programación.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-svh">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            The Hub
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-16">
        <section className="max-w-2xl space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Conectá tus sistemas.
            Simplificá tus integraciones.
          </h1>

          <p className="text-lg text-muted-foreground">
            The Hub es una plataforma de sincronización
            que conecta sistemas mediante un modelo de
            datos común y conectores reutilizables.
          </p>

          <Button size="lg" asChild>
            <Link href="/signup">Comenzar</Link>
          </Button>
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">
            Cómo funciona
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Business
              </h3>
              <p className="text-muted-foreground">
                Instalá conectores, configurá tus
                integraciones y administrá el intercambio
                de datos entre tus sistemas.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Development
              </h3>
              <p className="text-muted-foreground">
                Desarrollá conectores reutilizables y
                distribuilos a organizaciones que
                necesiten integrar sus sistemas.
              </p>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">
            Integraciones más simples
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="space-y-2">
                <h3 className="font-medium">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="max-w-2xl space-y-3">
          <h2 className="text-2xl font-semibold">
            Seguridad y control
          </h2>
          <p className="text-muted-foreground">
            El modelo de seguridad de The Hub se basa
            en roles por proyecto, permisos explícitos
            por integración y credenciales independientes
            para cada conector.
          </p>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            Preguntas frecuentes
          </h2>

          <Accordion type="single" collapsible>
            {questions.map(({ question, answer }, index) => (
              <AccordionItem
                key={question}
                value={String(index)}
              >
                <AccordionTrigger>
                  {question}
                </AccordionTrigger>
                <AccordionContent>
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            Empezá con The Hub
          </h2>
          <Button asChild>
            <Link href="/signup">Crear cuenta</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm text-muted-foreground">
            The Hub
          </span>
          <span className="text-sm text-muted-foreground">
            MVP
          </span>
        </div>
      </footer>
    </div>
  );
}
