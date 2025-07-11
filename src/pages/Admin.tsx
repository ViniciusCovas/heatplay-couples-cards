import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Edit3, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Card {
  id: string;
  level: number;
  category: string;
  text: string;
}

// Sample admin data - this will connect to database later
const INITIAL_CARDS: Card[] = [
  { id: '1', level: 1, category: 'reflexion', text: '¿Cuál fue tu primera impresión de mí?' },
  { id: '2', level: 1, category: 'dinamica', text: '¿Qué canción te recuerda a nosotros?' },
  { id: '3', level: 2, category: 'confianza', text: '¿Hay algo que siempre has querido decirme?' },
  { id: '4', level: 3, category: 'dinamica', text: '¿Cuál es tu fantasía más secreta?' },
];

const LEVELS = [
  { value: 1, label: 'Descubrimiento' },
  { value: 2, label: 'Confianza' },
  { value: 3, label: 'Sin filtros' }
];

const CATEGORIES = [
  { value: 'reflexion', label: 'Reflexión' },
  { value: 'confianza', label: 'Confianza' },
  { value: 'dinamica', label: 'Dinámica' }
];

const Admin = () => {
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [newCard, setNewCard] = useState({ level: 1, category: 'reflexion', text: '' });
  const { toast } = useToast();

  const handleSaveCard = () => {
    if (!newCard.text.trim()) {
      toast({
        title: "Error",
        description: "El texto de la carta no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    const card: Card = {
      id: Date.now().toString(),
      level: newCard.level,
      category: newCard.category,
      text: newCard.text.trim()
    };

    setCards(prev => [...prev, card]);
    setNewCard({ level: 1, category: 'reflexion', text: '' });
    
    toast({
      title: "Carta agregada",
      description: "La nueva carta ha sido guardada exitosamente"
    });
  };

  const handleEditCard = (card: Card) => {
    setEditingCard({ ...card });
  };

  const handleUpdateCard = () => {
    if (!editingCard?.text.trim()) return;

    setCards(prev => prev.map(card => 
      card.id === editingCard.id ? editingCard : card
    ));
    setEditingCard(null);
    
    toast({
      title: "Carta actualizada",
      description: "Los cambios han sido guardados"
    });
  };

  const handleDeleteCard = (cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    toast({
      title: "Carta eliminada",
      description: "La carta ha sido removida del sistema"
    });
  };

  const getCardsByLevel = (level: number) => {
    return cards.filter(card => card.level === level);
  };

  const getLevelStats = () => {
    return LEVELS.map(level => ({
      ...level,
      count: cards.filter(card => card.level === level.value).length
    }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading text-foreground">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona las cartas del juego</p>
        </div>

        {/* Stats */}
        <Card className="p-6">
          <h2 className="text-xl font-heading mb-4">Estadísticas</h2>
          <div className="grid grid-cols-3 gap-4">
            {getLevelStats().map(level => (
              <div key={level.value} className="text-center">
                <div className="text-2xl font-bold text-primary">{level.count}</div>
                <div className="text-sm text-muted-foreground">{level.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Tabs defaultValue="add" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">Agregar Carta</TabsTrigger>
            <TabsTrigger value="manage">Gestionar Cartas</TabsTrigger>
          </TabsList>

          {/* Add Card Tab */}
          <TabsContent value="add" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-heading mb-4">Nueva Carta</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Nivel
                    </label>
                    <Select 
                      value={newCard.level.toString()} 
                      onValueChange={(value) => setNewCard(prev => ({ ...prev, level: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value.toString()}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Categoría
                    </label>
                    <Select 
                      value={newCard.category} 
                      onValueChange={(value) => setNewCard(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Texto de la carta
                  </label>
                  <Textarea
                    placeholder="Escribe la pregunta o dinámica..."
                    value={newCard.text}
                    onChange={(e) => setNewCard(prev => ({ ...prev, text: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>

                <Button onClick={handleSaveCard} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Carta
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Manage Cards Tab */}
          <TabsContent value="manage" className="space-y-4">
            {LEVELS.map(level => (
              <Card key={level.value} className="p-6">
                <h3 className="text-lg font-heading mb-4 flex items-center">
                  {level.label}
                  <Badge variant="secondary" className="ml-2">
                    {getCardsByLevel(level.value).length} cartas
                  </Badge>
                </h3>
                
                <div className="space-y-3">
                  {getCardsByLevel(level.value).map(card => (
                    <div key={card.id} className="border rounded-lg p-4">
                      {editingCard?.id === card.id ? (
                        <div className="space-y-3">
                          <Select 
                            value={editingCard.category} 
                            onValueChange={(value) => setEditingCard(prev => prev ? { ...prev, category: value } : null)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Textarea
                            value={editingCard.text}
                            onChange={(e) => setEditingCard(prev => prev ? { ...prev, text: e.target.value } : null)}
                            className="min-h-[80px]"
                          />
                          
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateCard}>
                              <Save className="w-4 h-4 mr-1" />
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCard(null)}>
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {CATEGORIES.find(c => c.value === card.category)?.label}
                              </Badge>
                            </div>
                            <p className="text-foreground">{card.text}</p>
                          </div>
                          
                          <div className="flex gap-1 ml-4">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditCard(card)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDeleteCard(card.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {getCardsByLevel(level.value).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No hay cartas en este nivel
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;