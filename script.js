const rootCSS = document.documentElement;

const emociones = {
    normal: () => {
        rootCSS.style.setProperty('--eye-height', '120px');
        rootCSS.style.setProperty('--eye-radius', '50%');
        rootCSS.style.setProperty('--mouth-width', '80px');
        rootCSS.style.setProperty('--mouth-height', '15px');
        rootCSS.style.setProperty('--mouth-radius', '10px');
        document.getElementById('brow-left').style.transform = 'translateY(0px)';
        document.getElementById('brow-right').style.transform = 'translateY(0px)';
    },
    feliz: () => {
        rootCSS.style.setProperty('--eye-height', '80px');
        rootCSS.style.setProperty('--eye-radius', '50% 50% 0% 0%');
        rootCSS.style.setProperty('--mouth-width', '110px');
        rootCSS.style.setProperty('--mouth-height', '35px');
        rootCSS.style.setProperty('--mouth-radius', '0% 0% 50% 50%'); // Sonrisa circular
    },
    enojado: () => {
        rootCSS.style.setProperty('--eye-height', '90px');
        rootCSS.style.setProperty('--eye-radius', '50% 50% 30% 30%');
        rootCSS.style.setProperty('--mouth-width', '70px');
        rootCSS.style.setProperty('--mouth-height', '12px');
        rootCSS.style.setProperty('--mouth-radius', '50% 50% 0% 0%'); // Boca invertida
        document.getElementById('brow-left').style.transform = 'translateY(12px) rotate(15deg)';
        document.getElementById('brow-right').style.transform = 'translateY(12px) rotate(-15deg)';
    },
    hablando: () => {
        rootCSS.style.setProperty('--eye-height', '110px');
    }
};




class ChatbotInteligente {
    constructor() {
        this.memoria = {
            "hola": ["¡Hola! ¿Cómo estás?", "¡Buenas! Qué gusto hablar contigo."],
            "adios": ["¡Hasta luego!", "¡Nos vemos pronto!"],
            "quien eres": ["Soy un autómata conectado a tu Google Sheets."],
            "como estas": ["Estoy funcionando perfectamente, gracias por preguntar."],
            "como esta el clima": ["El clima en Lomas de Zamora está agradable hoy.", "No tengo mis sensores activados, pero espero que haga buen día en Lomas."]
        };
        this.estadoActual = 'REPOSO';
        this.ultimaPreguntaUsuario = '';
        
        // Tu URL de ejecución (Asegúrate de que en Google esté publicado como "Acceso: Cualquiera/Anyone")
        this.googleWebAppUrl = 'https://script.google.com/macros/s/AKfycbyvwNktHEJWVU6NGhI3oK6vHM-enhion3Yd4wzvu_ef55vaG3jmR6J2yHSgkxQWu9uU/exec'; 
    }

    normalizarTexto(texto) {
        if (!texto) return "";
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quita acentos
            .replace(/[¿?¡!.,\/#!\$%\^&\*;:{}=\-_`~()]/g, "") // Quita signos de puntuación
            .replace(/\s+/g, " ") 
            .trim();
    }

        // =========================================================================
    // 👇 1. EXTRACTOR INTERNO DE FECHAS 👇
    // =========================================================================
    extraerFechaDeTexto(textoMinuscula) {
        const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        
        // Expresión regular para buscar un número y el nombre de un mes
        const regexFecha = /\b(\d{1,2})\b\s*(?:de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
        const coincidencia = textoMinuscula.match(regexFecha);
        
        if (coincidencia) {
            const dia = parseInt(coincidencia[1], 10);
            const mesTexto = coincidencia[2].toLowerCase();
            return `nota_${dia}_de_${mesTexto}`; // Clave única para tu Sheets
        }
        return null;
    }

    // =========================================================================
    // 👇 2. BUSCADOR INTELIGENTE DE RESPUESTAS 👇
    // =========================================================================
    buscarRespuestaInteligente(entradaUsuario) {
        const entradaLimpia = this.normalizarTexto(entradaUsuario);
        if (!entradaLimpia) return null;

        // FILTRO DE AGENDA INTELIGENTE SEPARADO POR FECHAS
        if (entradaLimpia.includes("que tengo que hacer") || entradaLimpia.includes("mis notas") || entradaLimpia.includes("ver tareas") || entradaLimpia.includes("agenda")) {
            
            const mesesArray = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            let claveABuscar = null;
            let etiquetaFecha = "";

            // Caso A: Pregunta por una fecha específica (ej: ¿Qué tengo que hacer el 20 de noviembre?)
            const fechaEspecificaClave = this.extraerFechaDeTexto(entradaUsuario.toLowerCase());
            
            if (fechaEspecificaClave) {
                claveABuscar = fechaEspecificaClave;
                etiquetaFecha = fechaEspecificaClave.replace("nota_", "").replace(/_/g, " ");
            } 
            // Caso B: El usuario pregunta por "hoy"
            else if (entradaLimpia.includes("hoy")) {
                const hoy = new Date();
                claveABuscar = `nota_${hoy.getDate()}_de_${mesesArray[hoy.getMonth()]}`;
                etiquetaFecha = "hoy";
            } 
            // Caso C: El usuario pregunta por "manana"
            else if (entradaLimpia.includes("manana")) {
                const manana = new Date();
                manana.setDate(manana.getDate() + 1);
                claveABuscar = `nota_${manana.getDate()}_de_${mesesArray[manana.getMonth()]}`;
                etiquetaFecha = "mañana";
            }

            // Si identificamos qué día quiere consultar, listamos solo ese día
            if (claveABuscar) {
                const notasDelDia = this.memoria[claveABuscar];
                if (!notasDelDia || notasDelDia.length === 0 || notasDelDia == "") {
                    return `No tienes ninguna tarea anotada para **${etiquetaFecha}**. ¡Día libre! 😎`;
                }
                
                let listado = `Esto es lo que tienes pendiente para **${etiquetaFecha}**:\n`;
                const arrayNotas = Array.isArray(notasDelDia) ? notasDelDia : notasDelDia.split("||");
                arrayNotas.forEach(nota => {
                    if (nota.trim() !== "") listado += `• ${nota.trim()}\n`;
                });
                return listado.trim();
            }

            // Caso D: Pregunta general ("ver tareas" o "agenda") -> Muestra TODO organizado por fechas
            let agendaCompleta = "📋 **Tu Agenda Completa:**\n\n";
            let tieneTareas = false;

            Object.keys(this.memoria).forEach(clave => {
                if (clave.startsWith("nota_")) {
                    tieneTareas = true;
                    const fechaBonita = clave.replace("nota_", "").replace(/_/g, " ");
                    agendaCompleta += `📅 **${fechaBonita.toUpperCase()}:**\n`;
                    
                    const arrayNotas = Array.isArray(this.memoria[clave]) ? this.memoria[clave] : this.memoria[clave].split("||");
                    arrayNotas.forEach(nota => {
                        if (nota.trim() !== "") agendaCompleta += `  • ${nota.trim()}\n`;
                    });
                    agendaCompleta += "\n";
                }
            });

            return tieneTareas ? agendaCompleta.trim() : "No tienes ninguna nota o tarea guardada en tu agenda en este momento.";
        }

                // =========================================================================
        // 🔥 FILTRO MATEMÁTICO CORREGIDO (MANEJO DE SEPARADORES DE MILES) 🔥
        // =========================================================================
        let operacionProcesada = entradaUsuario.toLowerCase()
            // 1. Reemplazamos palabras del micrófono por signos matemáticos
            .replace(/más|mas/g, '+')
            .replace(/menos/g, '-')
            .replace(/por|\bx\b/g, '*')
            .replace(/dividido|entre/g, '/')

            // 2. DETECTOR DE MILES: Si hay una coma o punto seguido de exactamente 3 dígitos, se borra.
            // Esto transforma "115,000" en "115000" o "115.000" en "115000"
            .replace(/[,.](\d{3})(?=\D|\$)/g, '\$1')

            // 3. Pasamos las comas decimales restantes a puntos (ej: "10,5" pasa a "10.5")
            .replace(/[,]/g, '.')

            // 4. Limpiamos letras y dejamos solo números, signos y paréntesis
            .replace(/[^0-9+\-*/().]/g, '');

        // Verificamos que quede una estructura válida de cálculo (Número -> Signo -> Número)
        if (operacionProcesada && /[0-9]+[+\-*/][0-9]+/.test(operacionProcesada)) {
            try {
                const resultadoMatematico = new Function(`return ${operacionProcesada}`)();
                if (typeof resultadoMatematico === 'number' && !isNaN(resultadoMatematico) && isFinite(resultadoMatematico)) {
                    // Formateamos el resultado de vuelta para que use puntos de miles en español al mostrarlo
                    const resultadoFormateado = resultadoMatematico.toLocaleString('es-AR');
                    return `El resultado de esa cuenta es: **${resultadoFormateado}**`;
                }
            } catch (e) {
                console.error("Error en la evaluación matemática:", e);
            }
        }
        // =========================================================================



        // FILTRO DE FECHA Y HORA NATIVA
        if (entradaLimpia.includes("hora") || entradaLimpia.includes("fecha") || entradaLimpia.includes("dia") || entradaLimpia.includes("ano")) {
            const ahora = new Date();
            const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const fechaTexto = ahora.toLocaleDateString('es-AR', opcionesFecha);
            const horaTexto = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            if (entradaLimpia.includes("hora")) return `Son las **${horaTexto}**.`;
            if (entradaLimpia.includes("fecha") || entradaLimpia.includes("dia")) return `Hoy es **${fechaTexto}**.`;
            return `Hoy es **${fechaTexto}** y son las **${horaTexto}**.`;
        }

        // Coincidencia directa limpia primero
        let respuestaDirecta = null;
        Object.keys(this.memoria).forEach(preguntaGuardada => {
            if (this.normalizarTexto(preguntaGuardada) === entradaLimpia) {
                respuestaDirecta = preguntaGuardada;
            }
        });
        if (respuestaDirecta) return this.obtenerRespuestaAleatoria(respuestaDirecta);

        // Interceptores rápidos de clima
        if (entradaLimpia.includes("clima") || entradaLimpia.includes("tiempo")) {
            return this.obtenerRespuestaAleatoria("como esta el clima");
        }

        // Búsqueda inteligente por coincidencia de palabras clave
        let mejorCoincidencia = null;
        let maxPalabrasEnComun = 0;
        const palabrasUsuario = entradaLimpia.split(" ");

        Object.keys(this.memoria).forEach(preguntaGuardada => {
            const preguntaGuardadaLimpia = this.normalizarTexto(preguntaGuardada);
            const palabrasGuardadas = preguntaGuardadaLimpia.split(" ");
            let palabrasEnComun = 0;
            palabrasUsuario.forEach(palabra => {
                if (palabrasGuardadas.includes(palabra) && palabra.length > 3) {
                    palabrasEnComun++;
                }
            });
            if (palabrasEnComun > maxPalabrasEnComun) {
                maxPalabrasEnComun = palabrasEnComun;
                mejorCoincidencia = preguntaGuardada;
            }
        });

        if (maxPalabrasEnComun >= 1 && mejorCoincidencia) {
            return this.obtenerRespuestaAleatoria(mejorCoincidencia);
        }

        return null; 
    }


    




    obtenerRespuestaAleatoria(clave) {
        const respuestas = this.memoria[clave];
        return respuestas[Math.floor(Math.random() * respuestas.length)];
    }

        // =========================================================================
    // 👇 3. RECEPTOR CENTRAL DE MENSAJES Y GRABADOR DE NOTAS POR FECHA 👇
    // =========================================================================
        // =========================================================================
    // 👇 RECEPTOR CENTRAL CORREGIDO (EVITA AGENDAR CUANDO PREGUNTÁS) 👇
    // =========================================================================
        // =========================================================================
    // 👇 RECEPTOR CENTRAL CORREGIDO (EVITA AGENDAR CUANDO PREGUNTÁS) 👇
    // =========================================================================


    recibirMensaje(mensaje) {
        const mensajeLimpio = mensaje.trim();
        const mensajeMinuscula = mensajeLimpio.toLowerCase();

        // =========================================================================
        // 👇 NUEVO INTERCEPTOR: CANCELAR APRENDIZAJE (No importa / Cancela) 👇
        // =========================================================================
        if (this.estadoActual === 'APRENDIENDO' && 
            (mensajeMinuscula === "no importa" || mensajeMinuscula === "cancelar" || mensajeMinuscula === "deja" || mensajeMinuscula === "olvídalo")) {
            
            this.estadoActual = 'REPOSO'; // Volvemos a la normalidad sin guardar nada
            return "¡Entendido! Olvidamos esa última frase y seguimos conversando de forma normal.";
        }
        // =========================================================================

        // CONTROL REMOTO Y APERTURA DE MÚSICA
        if (mensajeMinuscula.includes("reproducir") || mensajeMinuscula.includes("pone musica")) {
            let ordenUnica = `PLAY_${Date.now()}`;
            this.guardarMemoriaEnNube("comando_musica", ordenUnica);
            const urlTuAppMusica = "https://luismarianolozano-star.github.io/musica/?action=play";
            setTimeout(() => { crearBotonAccesoMusica(urlTuAppMusica); }, 500); 
            return "¡Listo! Te dejé un botón en pantalla para abrir tu reproductor de música en una nueva pestaña.";
        }

        // SISTEMA DE BORRADO DE NOTAS O APRENDIZAJES
        if (mensajeMinuscula.startsWith("borrar") || mensajeMinuscula.startsWith("eliminar")) {
            let objetivoCutter = mensajeLimpio.replace(/^(borrar|eliminar)[:\s]*/i, "").trim();
            let claveABuscar = this.extraerFechaDeTexto(objetivoCutter.toLowerCase());
            if (!claveABuscar) claveABuscar = objetivoCutter;

            let claveRealEncontrada = null;
            const claveBuscadaLimpia = this.normalizarTexto(claveABuscar);

            Object.keys(this.memoria).forEach(key => {
                if (this.normalizarTexto(key) === claveBuscadaLimpia) claveRealEncontrada = key; 
            });

            if (claveRealEncontrada) {
                delete this.memoria[claveRealEncontrada];
                this.estadoActual = 'REPOSO';
                this.borrarMemoriaEnNube(claveRealEncontrada);
                const nombreBonito = claveRealEncontrada.replace("nota_", "").replace(/_/g, " ");
                return `Eliminado por completo ${nombreBonito} de mi memoria y de tu hoja de cálculo.`;
            } else {
                return `No encontré nada guardado bajo el nombre o fecha ${objetivoCutter} para borrar.`;
            }
        }

        const estaPreguntandoPorAgenda = mensajeMinuscula.includes("que tengo") || mensajeMinuscula.includes("ver") || mensajeMinuscula.includes("consultar") || mensajeMinuscula.includes("agenda") || mensajeMinuscula.includes("mis notas");
        const claveFechaDetectada = this.extraerFechaDeTexto(mensajeMinuscula);

        // Agendador de notas automático
        if (claveFechaDetectada && !estaPreguntandoPorAgenda) {
            let contenidoNota = mensajeLimpio.replace(/^(anotar|recordar|guardar nota)[:\s]*/i, "").trim();
            if (!this.memoria[claveFechaDetectada]) {
                this.memoria[claveFechaDetectada] = [];
            } else if (typeof this.memoria[claveFechaDetectada] === 'string') {
                this.memoria[claveFechaDetectada] = this.memoria[claveFechaDetectada].split("||");
            }

            this.memoria[claveFechaDetectada].push(contenidoNota);
            const notasUnificadas = this.memoria[claveFechaDetectada].filter(n => n.trim() !== "").join("||");
            this.guardarMemoriaEnNube(claveFechaDetectada, notasUnificadas);
            const fechaBonita = claveFechaDetectada.replace("nota_", "").replace(/_/g, " ");
            return `¡Agendado con éxito! Guardé en tu lista del ${fechaBonita}: ${contenidoNota}`;
        }

        // Modo Aprendizaje Activo (Guardado efectivo si no canceló)
        if (this.estadoActual === 'APRENDIENDO') {
            const preguntaGuardar = this.ultimaPreguntaUsuario;
            const respuestaNueva = mensajeLimpio;
            this.memoria[preguntaGuardar] = [respuestaNueva];
            this.estadoActual = 'REPOSO';
            this.guardarMemoriaEnNube(preguntaGuardar, respuestaNueva);
            return `¡Entendido! Guardé que cuando me digas ${preguntaGuardar}, debo responder ${respuestaNueva}`;
        }

        // Conversación estándar
        this.ultimaPreguntaUsuario = mensajeLimpio;
        const respuesta = this.buscarRespuestaInteligente(mensajeLimpio);

        if (respuesta) {
            this.estadoActual = 'REPOSO';
            return respuesta;
        } else {
            this.estadoActual = 'APRENDIENDO';
            return `No sé qué responder a ${mensajeLimpio}. ¿Qué debería decir?`;
        }
    }








    // Carga inicial (doGet)
    async cargarMemoriaDesdeNube() {
        if (!this.googleWebAppUrl || !this.googleWebAppUrl.includes('script.google.com')) return;
        try {
            const respuesta = await fetch(this.googleWebAppUrl, { method: 'GET', redirect: 'follow' });
            const filas = await respuesta.json();
            if (filas && filas.length > 0) {
                this.memoria = {};
                filas.forEach(fila => {
                    if(fila.pregunta && fila.respuestas) {
                        this.memoria[fila.pregunta] = fila.respuestas.split('||');
                    }
                });
                console.log("🧠 Memoria sincronizada con Google Sheets exitosamente.");
            }
        } catch (error) {
            console.error("❌ Error al cargar memoria desde la nube:", error);
        }
    }

    // Escritura corregida sin bloqueos de CORS (doPost)
    async guardarMemoriaEnNube(pregunta, respuestas) {
        if (!this.googleWebAppUrl || !this.googleWebAppUrl.includes('script.google.com')) return;
        try {
            // ENFOQUE SOLUCIÓN: Usamos text/plain y eliminamos no-cors. Google Apps Script procesará el JSON igual de bien.
            await fetch(this.googleWebAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ pregunta: pregunta, respuestas: respuestas }),
                redirect: 'follow'
            });
            console.log("☁️ Nuevo aprendizaje enviado a Google Sheets.");
        } catch (error) {
            console.error("❌ Error al guardar en la nube:", error);
        }
    }

        // Envía la petición de borrado a Google Sheets
       // Envía la petición de borrado mapeada a tu nueva función de Sheets
    async borrarMemoriaEnNube(pregunta) {
        if (!this.googleWebAppUrl || !this.googleWebAppUrl.includes('://google.com')) return;
        try {
            await fetch(this.googleWebAppUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                // Enviamos "BORRAR_REGISTRO" como respuesta para activar el borrado físico en el Sheets
                body: JSON.stringify({ pregunta: pregunta, respuestas: "BORRAR_REGISTRO" }), 
                redirect: 'follow'
            });
            console.log(`🗑️ Orden de eliminación ejecutada para: ${pregunta}`);
        } catch (error) {
            console.error("❌ Error al mandar orden de borrado a la nube:", error);
        }
    }


}

// =========================================================================
// INTERACCIÓN CON EL DOM (INDEX.HTML)
// =========================================================================
const bot = new ChatbotInteligente();
bot.cargarMemoriaDesdeNube();

const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const chatMessages = document.getElementById('chatMessages');

function agregarMensajeAPantalla(texto, emisor) {
    const contenedorMensaje = document.createElement('div');
    contenedorMensaje.classList.add('message', `${emisor}-message`);
    contenedorMensaje.innerText = texto;
    chatMessages.appendChild(contenedorMensaje);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const mensajeTexto = userInput.value.trim();
    if (mensajeTexto === "") return;

    agregarMensajeAPantalla(mensajeTexto, 'user');
    const respuestaBot = bot.recibirMensaje(mensajeTexto);
    agregarMensajeAPantalla(respuestaBot, 'bot');
    userInput.value = "";
});

// =========================================================================
// 👇 SISTEMA AUTOMÁTICO DE VOZ COMPLETO (REEMPLAZA TODO EL FINAL) 👇
// =========================================================================
// =========================================================================
// 👇 SISTEMA AUTOMÁTICO DE VOZ COMPLETO CON CANDADO CONTRA ECO 👇
// =========================================================================
// --- CONFIGURACIÓN DEL RECONOCIMIENTO DE VOZ (MICRÓFONO) ---
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'es-AR'; // Configurado para español de Argentina
recognition.continuous = true; // Se mantiene escuchando para captar la palabra de activación
recognition.interimResults = false;

// Iniciamos el micrófono automáticamente al cargar la aplicación
recognition.start();

recognition.onresult = async (event) => {
    // PROTECCIÓN CRUCIAL: Verificamos que existan resultados reales antes de leerlos
    if (!event.results || event.results.length === 0) return;
    
    const resultadoActual = event.results[event.results.length - 1];
    if (!resultadoActual || !resultadoActual[0]) return;

    // Extraemos la frase y nos aseguramos de que no sea undefined antes de usar .trim()
    const ultimaFraseEscuchada = resultadoActual[0].transcript;
    if (!ultimaFraseEscuchada) return;

    const fraseLimpiaEspacios = ultimaFraseEscuchada.trim();
    console.log("Micrófono escuchó original:", fraseLimpiaEspacios); 

    // =========================================================================
    // 🔥 ELIMINADOR DE ACENTOS Y TILDES DEFINITIVO 🔥
    // =========================================================================
    const fraseLimpiaSintildes = fraseLimpiaEspacios.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    
    console.log("Frase procesada sin tildes:", fraseLimpiaSintildes);
    // =========================================================================

    // Evaluamos la palabra de activación usando la frase limpia
    if (fraseLimpiaSintildes.startsWith("robot")) {
        const ordenLimpia = fraseLimpiaSintildes.replace(/^robot[\s,.]*/i, "").trim();

        if (!ordenLimpia) return; 

        // Mostramos en pantalla el texto limpio
        agregarMensajeAPantalla(ordenLimpia, 'user');
        
        // Enviamos la orden sin tildes a tu función del bot
        const respuestaBot = await bot.recibirMensaje(ordenLimpia);
        
        setTimeout(() => {
            agregarMensajeAPantalla(respuestaBot, 'bot');
            responderHablando(respuestaBot); 
        }, 200);
    } else {
        console.log("Frase ignorada (No se usó la palabra de activación).");
    }
};



// Reiniciar el micrófono automáticamente si se corta por inactividad
recognition.onend = () => {
    recognition.start();
};






// --- INICIALIZACIÓN OBLIGATORIA (Poner arriba en tu archivo si no lo tenías) ---
const synth = window.speechSynthesis;
let elBotEstaHablando = false; // Variable de control para el candado de audio

// FUNCIÓN DE SALIDA DE AUDIO CORREGIDA
// --- MODIFICACIÓN EN TU FUNCIÓN DE AUDIO (responderHablando) ---
// Buscá tu función 'responderHablando' y agregá los disparadores emocionales adentro:

// --- FUNCIÓN DE HABLA ACTUALIZADA CON LIP-SYNC ASOCIATIVO ---
function responderHablando(textoAProcesar) {
    if (!textoAProcesar || !synth) return;

    emociones.hablando();
    const textoLimpioVoz = textoAProcesar.replace(/\*\*/g, ""); 
    if (synth.speaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(textoLimpioVoz);
    utterance.lang = 'es-AR'; 

    // ANIMACIÓN DE LA BOCA: El evento boundary detecta cada palabra pronunciada por el hardware
    utterance.onboundary = (event) => {
        if (event.name === 'word') {
            // Genera formas de boca aleatorias y rápidas simulando fonemas/visemas
            const h = Math.floor(Math.random() * 30) + 20; // Altura variable entre 20px y 50px
            const w = Math.floor(Math.random() * 40) + 70; // Ancho variable entre 70px y 110px
            rootCSS.style.setProperty('--mouth-height', `${h}px`);
            rootCSS.style.setProperty('--mouth-width', `${w}px`);
            rootCSS.style.setProperty('--mouth-radius', '50%'); // Redondeada mientras habla
        }
    };

    try { recognition.stop(); } catch(e) {}

    setTimeout(() => {
        utterance.onend = () => {
            emociones.normal(); // Restablece los ojos y la boca al terminar la frase
            setTimeout(() => { try { recognition.start(); } catch (e) {} }, 600);
        };
        utterance.onerror = () => {
            emociones.normal();
            try { recognition.start(); } catch (e) {}
        };
        synth.speak(utterance);
    }, 300); 
}

// CONTROL CLÁSICO DE FORMULARIO CORREGIDO (ASÍNCRONO)
if (chatForm) {
    // Añadimos 'async' al evento para poder usar 'await' con la base de datos de Google y el clima
    chatForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const mensajeTexto = userInput.value.trim();
        if (mensajeTexto === "") return;

        agregarMensajeAPantalla(mensajeTexto, 'user');
        userInput.value = "";

        // 🔥 CORREGIDO: Agregamos 'await' porque recibirMensaje ahora va a buscar a la nube o a la API del clima
        const respuestaBot = await bot.recibirMensaje(mensajeTexto);
        
        agregarMensajeAPantalla(respuestaBot, 'bot');
        
        // Ejecutamos la voz con el texto real ya descargado
        responderHablando(respuestaBot);
    });
}


// Función para crear un botón flotante temporal que saltea el bloqueo de pestañas
function crearBotonAccesoMusica(urlDestino) {
    // Si ya existe un botón en pantalla, lo borramos para no duplicar
    const botonViejo = document.getElementById('btn-acceso-musica');
    if (botonViejo) botonViejo.remove();

    const botonFlotante = document.createElement('button');
    botonFlotante.id = 'btn-acceso-musica';
    
    // Estilos para que sea un botón grande, centrado y fácil de tocar en el celular
    botonFlotante.style.position = 'fixed';
    botonFlotante.style.bottom = '90px'; // Lo ubica justo arriba de la caja de texto del chat
    botonFlotante.style.left = '50%';
    botonFlotante.style.transform = 'translateX(-50%)';
    botonFlotante.style.backgroundColor = '#1DB954'; // Verde Spotify
    botonFlotante.style.color = '#fff';
    botonFlotante.style.border = 'none';
    botonFlotante.style.padding = '15px 25px';
    botonFlotante.style.borderRadius = '30px';
    botonFlotante.style.fontSize = '16px';
    botonFlotante.style.fontWeight = 'bold';
    botonFlotante.style.cursor = 'pointer';
    botonFlotante.style.zIndex = '99999';
    botonFlotante.style.boxShadow = '0px 4px 15px rgba(0,0,0,0.3)';
    botonFlotante.innerText = '🎵 TOCÁ ACÁ PARA ABRIR LA MÚSICA';

    // Al hacer clic, el navegador sí permite abrir la pestaña nueva porque proviene de una acción del usuario
    botonFlotante.addEventListener('click', () => {
        window.open(urlDestino, "_blank");
        botonFlotante.remove(); // El botón se borra solo una vez que cumplió su función
    });

    // Agregamos el botón al cuerpo de tu HTML
    document.body.appendChild(botonFlotante);

    // Si pasaron 15 segundos y no lo tocaste, el botón desaparece solo para no molestar
    setTimeout(() => {
        if (document.getElementById('btn-acceso-musica')) {
            botonFlotante.remove();
        }
    }, 15000);
}

